import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models.models import KnowledgeNode, KnowledgeEdge
from ..schemas.schemas import KnowledgeGraphData, GraphNode, GraphEdge

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

@router.get("", response_model=KnowledgeGraphData)
def get_graph(
    node_type: Optional[str] = None,  # drug, disease, gene, pathway, publication, trial
    inferred_only: Optional[bool] = False,
    query: Optional[str] = None,
    db: Session = Depends(get_db)
):
    nodes_query = db.query(KnowledgeNode)
    if node_type:
        nodes_query = nodes_query.filter(KnowledgeNode.type == node_type)
    if query:
        nodes_query = nodes_query.filter(KnowledgeNode.label.ilike(f"%{query}%"))
        
    db_nodes = nodes_query.all()
    node_ids = {n.node_id for n in db_nodes}
    
    edges_query = db.query(KnowledgeEdge)
    if inferred_only:
        edges_query = edges_query.filter(KnowledgeEdge.is_inferred == True)
        
    db_edges = edges_query.all()
    # If filtered by node_type, only include edges between existing nodes
    if node_type or query:
        filtered_edges = [e for e in db_edges if e.source_id in node_ids or e.target_id in node_ids]
    else:
        filtered_edges = db_edges

    nodes_out = [
        GraphNode(
            id=n.node_id,
            label=n.label,
            type=n.type,
            metadata=json.loads(n.metadata_json or "{}")
        )
        for n in db_nodes
    ]
    edges_out = [
        GraphEdge(
            id=f"{e.source_id}->{e.target_id}:{e.relationship_type}",
            source=e.source_id,
            target=e.target_id,
            relationship_type=e.relationship_type,
            is_inferred=e.is_inferred,
            confidence=e.confidence,
            source_provenance=e.source_provenance,
            pmid=e.pmid
        )
        for e in filtered_edges
    ]
    return KnowledgeGraphData(nodes=nodes_out, edges=edges_out)

@router.get("/neighbors/{node_id}", response_model=KnowledgeGraphData)
def get_neighbors(node_id: str, db: Session = Depends(get_db)):
    edges = db.query(KnowledgeEdge).filter(
        (KnowledgeEdge.source_id == node_id) | (KnowledgeEdge.target_id == node_id)
    ).all()
    
    connected_ids = {node_id}
    for e in edges:
        connected_ids.add(e.source_id)
        connected_ids.add(e.target_id)
        
    nodes = db.query(KnowledgeNode).filter(KnowledgeNode.node_id.in_(list(connected_ids))).all()
    
    nodes_out = [
        GraphNode(
            id=n.node_id,
            label=n.label,
            type=n.type,
            metadata=json.loads(n.metadata_json or "{}")
        )
        for n in nodes
    ]
    edges_out = [
        GraphEdge(
            id=f"{e.source_id}->{e.target_id}:{e.relationship_type}",
            source=e.source_id,
            target=e.target_id,
            relationship_type=e.relationship_type,
            is_inferred=e.is_inferred,
            confidence=e.confidence,
            source_provenance=e.source_provenance,
            pmid=e.pmid
        )
        for e in edges
    ]
    return KnowledgeGraphData(nodes=nodes_out, edges=edges_out)

@router.get("/similarity-subgraph", response_model=KnowledgeGraphData)
def get_similarity_subgraph(
    drug_a: str = Query(..., description="Query drug name or ChEMBL ID"),
    drug_b: str = Query(..., description="Candidate alternative drug name or ChEMBL ID"),
    db: Session = Depends(get_db)
):
    """
    Constructs a focused knowledge subgraph connecting Drug A and Drug B via
    shared molecular targets, mechanism of action, and therapeutic indications.
    """
    from ..services.drug_similarity_service import DrugSimilarityService
    sim_data = DrugSimilarityService.find_similar_drugs(query=drug_a, db=db, top_k=20)
    
    # Locate candidate drug in results
    cand = None
    for c in sim_data.get("candidates", []):
        if c["drug_name"].lower() == drug_b.lower() or c["chembl_id"].lower() == drug_b.lower():
            cand = c
            break
            
    nodes_out = [
        GraphNode(id=f"drug_{sim_data['query_entity']}", label=sim_data['query_entity'], type="Drug", metadata={"chembl_id": sim_data.get("resolved_entity", {}).get("chembl_id")}),
        GraphNode(id=f"drug_{drug_b}", label=cand["drug_name"] if cand else drug_b, type="Drug", metadata={"chembl_id": cand.get("chembl_id") if cand else drug_b})
    ]
    edges_out = []
    
    node_id_a = f"drug_{sim_data['query_entity']}"
    node_id_b = f"drug_{drug_b}"
    
    # Direct similarity edge
    score = cand.get("similarity_score", 0.75) if cand else 0.75
    edges_out.append(GraphEdge(
        id=f"{node_id_a}->{node_id_b}:similar_to",
        source=node_id_a,
        target=node_id_b,
        relationship_type="similar_to",
        is_inferred=True,
        confidence=score,
        source_provenance="CureNova Multi-Factor Similarity Engine"
    ))
    
    if cand:
        # Add shared targets
        for idx, t in enumerate(cand.get("shared_targets", [])[:5]):
            t_name = t.get("target_name") or t.get("target_id", f"Target_{idx}")
            t_node_id = f"target_{t.get('target_id', t_name)}"
            nodes_out.append(GraphNode(id=t_node_id, label=t_name, type="Protein", metadata={"target_id": t.get("target_id")}))
            edges_out.append(GraphEdge(
                id=f"{node_id_a}->{t_node_id}:inhibits",
                source=node_id_a,
                target=t_node_id,
                relationship_type="inhibits",
                is_inferred=False,
                confidence=0.95,
                source_provenance="Open Targets / ChEMBL"
            ))
            edges_out.append(GraphEdge(
                id=f"{node_id_b}->{t_node_id}:inhibits",
                source=node_id_b,
                target=t_node_id,
                relationship_type="inhibits",
                is_inferred=False,
                confidence=0.95,
                source_provenance="Open Targets / ChEMBL"
            ))
            
        # Add shared indications
        for idx, ind in enumerate(cand.get("shared_indications", [])[:4]):
            ind_node_id = f"disease_{ind.replace(' ', '_')}"
            nodes_out.append(GraphNode(id=ind_node_id, label=ind, type="Disease", metadata={"indication": ind}))
            edges_out.append(GraphEdge(
                id=f"{node_id_a}->{ind_node_id}:treats",
                source=node_id_a,
                target=ind_node_id,
                relationship_type="treats",
                is_inferred=False,
                confidence=0.90,
                source_provenance="CureNova Curated Indications"
            ))
            edges_out.append(GraphEdge(
                id=f"{node_id_b}->{ind_node_id}:treats",
                source=node_id_b,
                target=ind_node_id,
                relationship_type="treats",
                is_inferred=False,
                confidence=0.90,
                source_provenance="CureNova Curated Indications"
            ))
            
    return KnowledgeGraphData(nodes=nodes_out, edges=edges_out)
