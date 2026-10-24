from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import User
from ..schemas.schemas import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication & Roles"])

@router.get("/me", response_model=UserOut)
def get_current_user(role: str = "researcher", db: Session = Depends(get_db)):
    """Returns the active user for the given role context (researcher, doctor, patient)."""
    user = db.query(User).filter(User.role == role).first()
    if not user:
        user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    return user

@router.post("/login", response_model=UserOut)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    """Logs in user or provides demo login session."""
    user = db.query(User).filter(User.email == creds.email).first()
    if not user:
        # For demo ease, resolve to matching or default user
        user = db.query(User).first()
    return user

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
