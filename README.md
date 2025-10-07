To run the Resume Matcher project locally, follow these steps:

Clone the repository:

git clone https://github.com/<your-username>/resume_matcher.git
cd resume_matcher


Setup backend (Flask):

cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt


Setup frontend (React):

cd ../frontend
npm install
npm start


Open your browser at http://localhost:3000 to use the app.
