from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Any, Union

from app.core.deps import get_db, get_current_user
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.all_models import User, ActivityLog, Vendor, UserRole
from app.schemas.all_schemas import UserRegister, UserResponse, Token, UserLogin
from app.services.logging_service import write_activity

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Check if email is already taken
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    vendor_id = user_in.vendor_id
    vendor_obj = None
    
    # Auto-create vendor if registering as vendor and details are provided
    if user_in.role == UserRole.vendor and not vendor_id and user_in.vendor_name:
        vendor_obj = Vendor(
            name=user_in.vendor_name,
            category=user_in.vendor_category or "IT Hardware",
            gst_number=user_in.vendor_gst_number,
            contact_name=f"{user_in.first_name} {user_in.last_name or ''}".strip(),
            contact_phone=user_in.phone,
            contact_email=user_in.email,
            address=user_in.vendor_address,
            status="pending",
            rating=0.0
        )
        db.add(vendor_obj)
        await db.flush()
        vendor_id = vendor_obj.id

    db_obj = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        country=user_in.country,
        role=user_in.role,
        vendor_id=vendor_id,
        additional_info=user_in.additional_info,
        is_active=True
    )
    db.add(db_obj)
    await db.flush()
    
    if vendor_obj:
        vendor_obj.created_by = db_obj.id
        db.add(vendor_obj)
        
    await db.commit()
    await db.refresh(db_obj)
    
    # Audit log
    await write_activity(
        db,
        actor_id=db_obj.id,
        actor_name=f"{db_obj.first_name} {db_obj.last_name or ''}".strip(),
        entity_type="user",
        entity_id=db_obj.id,
        action="registered",
        description=f"User {db_obj.email} registered with role {db_obj.role.value}"
    )
    await db.commit()
    
    return db_obj

# Support login via JSON payload (default for SPA) and standard OAuth2 form (default for OpenAPI docs)
@router.post("/login", response_model=Token)
async def login_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    email = None
    password = None
    
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email")
            password = body.get("password")
        except Exception:
            pass
    else:
        # Fallback/default to form data
        try:
            form = await request.form()
            email = form.get("username")
            password = form.get("password")
        except Exception:
            pass
            
    if not email or not password:
        print(f"[LOGIN ERROR] Missing credentials. email={email}, password_provided={bool(password)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing email or password credentials"
        )
    
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if not user:
        print(f"[LOGIN ERROR] User not found: {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    if not verify_password(password, user.password_hash):
        print(f"[LOGIN ERROR] Incorrect password for user: {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    if not user.is_active:
        print(f"[LOGIN ERROR] User is inactive: {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token = create_access_token(
        subject=user.id, role=user.role.value
    )
    
    # Audit log
    await write_activity(
        db,
        actor_id=user.id,
        actor_name=f"{user.first_name} {user.last_name or ''}".strip(),
        entity_type="user",
        entity_id=user.id,
        action="login",
        description=f"User {user.email} logged in successfully."
    )
    await db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    return current_user

@router.post("/forgot-password")
async def forgot_password() -> Any:
    # Hackathon scope: stub only
    return {"ok": True}
