# Installation

### Step 1: Install Dependencies

```bash
pip install fastapi uvicorn
pip install pymongo pydantic
pip install tweetnlp
pip install vaderSentiment
pip install nltk
```

### Step 2: Run the Application
#### Example open command
```bash
uvicorn main:app
uvicorn main:app --reload
```

### Step 3: Keep the Server Running
Make sure to keep the server running at [http://127.0.0.1:8000/].


### Step 4: Check the Datasets
You can check the datasets at the following endpoints:

- **Analyze Sentences**: http://127.0.0.1:8000/analyze_sentences
- **Sentence Emotion Result**: http://127.0.0.1:8000/sentiment/sentence_emotion_result.json
- **Emotion Result**: http://localhost:8000/sentiment/emotion_result.json






