import json
import google.generativeai as genai
from sqlalchemy.orm import Session

from app.config import settings
from app.tools import (
    get_order_status, get_product_info, get_cargo_status,
    check_stock_alerts, draft_supplier_email,
    generate_daily_briefing, send_manager_alert,
    TOOL_DECLARATIONS,
)
from app import crud

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """Sen SmartFlow AI'sın. KOBİ'lere yönelik bir operasyon asistanısın.
Müşteri mesajlarını Türkçe olarak anlayıp cevapla.
ASLA tahmin yürütme — önce ilgili tool'u çağır, gelen veriye göre cevap ver.
Cevapların kısa, nazik ve profesyonel olsun."""

# Tool adı → Python fonksiyonu eşleştirmesi
# DB gerektiren fonksiyonlar için db'yi closure'dan inject edeceğiz
TOOL_MAP = {
    "get_order_status": get_order_status,
    "get_product_info": get_product_info,
    "get_cargo_status": get_cargo_status,
    "check_stock_alerts": check_stock_alerts,
    "draft_supplier_email": draft_supplier_email,
    "generate_daily_briefing": generate_daily_briefing,
    "send_manager_alert": send_manager_alert,
}

DB_TOOLS = {  # DB Session gerektiren tool'lar
    "get_order_status", "get_product_info", "get_cargo_status",
    "check_stock_alerts", "draft_supplier_email", "generate_daily_briefing"
}


def process_chat(message: str, db: Session) -> dict:
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT,
        tools=TOOL_DECLARATIONS,
    )

    tool_calls_used = []
    dashboard_notes = []
    
    # İlk istek
    response = model.generate_content(message)
    
    # Tool calling döngüsü (max 3 tur)
    for _ in range(3):
        part = response.candidates[0].content.parts[0]
        
        if not hasattr(part, "function_call") or not part.function_call.name:
            # Gemini düz cevap verdi, döngüden çık
            break
        
        fn_name = part.function_call.name
        fn_args = dict(part.function_call.args)
        tool_calls_used.append(fn_name)
   
      # Python fonksiyonunu çağır
        fn = TOOL_MAP[fn_name]
        if fn_name in DB_TOOLS:
            fn_result = fn(db, **fn_args)
        else:
            fn_result = fn(**fn_args)
        
        # Gecikme tespiti → dashboard notu
        if fn_name in ("get_order_status", "get_cargo_status"):
            if fn_result.get("delay_days", 0) > 0:
                oid = fn_args.get("order_id")
                dashboard_notes.append(f"{oid} numaralı sipariş için gecikme uyarısı oluşturuldu.")

        # Sonucu Gemini'ye geri gönder
        response = model.generate_content([
            {"role": "user", "parts": [message]},
            {"role": "model", "parts": [part]},
            {
                "role": "user",
                "parts": [{
                    "function_response": {
                        "name": fn_name,
                        "response": fn_result,
                    }
                }]
            }
        ])
    
    # Final metin cevabı
    final_text = response.candidates[0].content.parts[0].text

    # Intent'i basitçe tespit et (Gemini'den ayrı, hızlı kural bazlı)
    intent = _detect_intent(message, tool_calls_used)
    entities = _extract_entities(message)


    # Mesajı DB'ye kaydet
    crud.create_message(db, customer_message=message, ai_response=final_text, intent=intent)

    return {
        "intent": intent,
        "entities": entities,
        "reply": final_text,
        "tool_calls": tool_calls_used,
        "dashboard_note": "; ".join(dashboard_notes) if dashboard_notes else "",
    }



def _detect_intent(message: str, tool_calls: list[str]) -> str:
    if "get_order_status" in tool_calls:
        return "ORDER_STATUS"
    if "get_cargo_status" in tool_calls:
        return "CARGO_STATUS"
    if "get_product_info" in tool_calls:
        return "PRODUCT_INFO"
    if "check_stock_alerts" in tool_calls:
        return "STOCK_ALERT"
    if "generate_daily_briefing" in tool_calls:
        return "DAILY_BRIEFING"
    # Fallback: keyword
    msg = message.lower()
    if any(w in msg for w in ["sipariş", "nerede", "geldi mi"]):
        return "ORDER_STATUS"
    if any(w in msg for w in ["kargo", "gecik"]):
        return "CARGO_STATUS"
    if any(w in msg for w in ["stok", "var mı", "kaç adet"]):
        return "PRODUCT_INFO"
    if any(w in msg for w in ["özet", "brifing", "bugün"]):
        return "DAILY_BRIEFING"
    return "GENERAL"


def _extract_entities(message: str) -> dict:
    import re
    entities = {}
    match = re.search(r'\b(\d{3,})\b', message)  # 3+ haneli sayı = order_id
    if match:
        entities["order_id"] = int(match.group(1))
    return entities


MOCK_RESPONSES = {
    "ORDER_STATUS": "128 numaralı siparişiniz kargoda görünüyor. Tahmini teslimat bugün 17:00.",
    "CARGO_STATUS": "142 numaralı siparişinizde 2 günlük gecikme var. Ankara Aktarma Merkezi'nde.",
    "PRODUCT_INFO": "Ürün stokta mevcut.",
    "DAILY_BRIEFING": "Bugün 12 sipariş var. 1 kargo gecikmiş, 2 ürün kritik stokta.",
    "GENERAL": "Merhaba! Nasıl yardımcı olabilirim?",
}

def process_chat(message: str, db: Session) -> dict:
    try:
        return _process_chat_real(message, db)
    except Exception as e:
        intent = _detect_intent(message, [])
        return {
            "intent": intent,
            "entities": _extract_entities(message),
            "reply": MOCK_RESPONSES.get(intent, MOCK_RESPONSES["GENERAL"]),
            "tool_calls": [],
            "dashboard_note": f"[MOCK] Gemini API hatası: {str(e)[:60]}",
        }
