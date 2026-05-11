from fastapi import APIRouter, Body
from app.email_service import send_manager_alert_email

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.post("/send")
def send_alert(
    subject: str = Body(...),
    body: str = Body(...),
):
    ok = send_manager_alert_email(subject, body)
    return {"sent": ok}
