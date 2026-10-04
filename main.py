import os
from fastapi import FastAPI, Request, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

# Setup HTML template directory
templates = Jinja2Templates(directory="templates")

# Directly embedded Supabase connection string to ensure Render finds the database
DATABASE_URL = "postgresql://postgres.itstmdmgnitcstjuyuzb:Tkb0xtTNbh3R0wav@://supabase.com"

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request, db=Depends(get_db)):
    cur = db.cursor()
    # Fetch recent collections to show on dashboard
    cur.execute("""
        SELECT mc.*, f.name as farmer_name 
        FROM milk_collections mc 
        JOIN farmers f ON mc.farmer_id = f.id 
        ORDER BY mc.collected_at DESC LIMIT 10;
    """)
    logs = cur.fetchall()
    
    # Fetch farmers for the dropdown menu
    cur.execute("SELECT id, name, farmer_code FROM farmers ORDER BY name ASC;")
    farmers = cur.fetchall()
    
    cur.close()
    return templates.TemplateResponse("index.html", {"request": request, "logs": logs, "farmers": farmers})

@app.post("/add-collection")
def add_collection(
    farmer_id: int = Form(...),
    quantity: float = Form(...),
    fat: float = Form(...),
    snf: float = Form(...),
    price: float = Form(...),
    db=Depends(get_db)
):
    cur = db.cursor()
    cur.execute(
        """INSERT INTO milk_collections (farmer_id, center_id, quantity_liters, fat_percentage, snf_percentage, price_per_liter) 
           VALUES (%s, 1, %s, %s, %s, %s);""",
        (farmer_id, quantity, fat, snf, price)
    )
    db.commit()
    cur.close()
    return RedirectResponse(url="/", status_code=303)
