from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

async def next_number(db: AsyncSession, prefix: str, doc_type: str) -> str:
    """
    Generates a race-safe, human-friendly sequential document number.
    E.g. prefix="PO", doc_type="purchase_order" -> "PO-2026-0001"
    """
    result = await db.execute(
        text("SELECT next_doc_number(:prefix, :doc_type)"),
        {"prefix": prefix, "doc_type": doc_type}
    )
    return result.scalar()
