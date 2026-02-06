from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "FastAPI running 🚀"}

@app.post("/post")
def post_data(data: dict):
    return {"received": data}
