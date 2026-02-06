from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello World! My first backend app 🚀"

@app.route("/hello")
def hello():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(debug=True)
