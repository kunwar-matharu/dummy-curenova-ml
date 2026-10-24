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
