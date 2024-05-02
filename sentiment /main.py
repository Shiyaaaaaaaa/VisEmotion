from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import tweetnlp
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import json
from nltk.tokenize import sent_tokenize
import os
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.probability import FreqDist
import string

class Item(BaseModel):
    text: str
    time: str  # Add a time field to the data model

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = tweetnlp.load_model('emotion')
analyzer = SentimentIntensityAnalyzer()

def classify_sentiment(compound_score):
    if compound_score >= 0.05:
        return "positive"
    elif compound_score <= -0.05:
        return "negative"
    else:
        return "neutral"

def extract_keywords(text):
    stop_words = set(stopwords.words("english"))
    word_tokens = word_tokenize(text.lower())
    filtered_words = [word for word in word_tokens if word not in stop_words and word.isalpha()]
    fdist = FreqDist(filtered_words)
    return [word for word, count in fdist.most_common(3)]

def analyze_sentence(text, time):
    sentences = sent_tokenize(text)
    results = []
    for sentence in sentences:
        tweetnlp_result = model.emotion(sentence, return_probability=True)
        vader_scores = analyzer.polarity_scores(sentence)
        compound_score = vader_scores["compound"]
        sentiment_label = classify_sentiment(compound_score)
        keywords = extract_keywords(sentence)
        result = {
            "sentence": sentence,
            "keywords": keywords,
            "emotion": tweetnlp_result,
            "sentiment": {
                "neg": vader_scores["neg"],
                "neu": vader_scores["neu"],
                "pos": vader_scores["pos"],
                "compound": compound_score,
                "label": sentiment_label
            }
        }
        results.append({
            "time": time,
            "sentence": sentence,
            "keywords": keywords,
            "result": result
        })
    return results

def perform_emotion_analysis(text, time):
    tweetnlp_result = model.emotion(text, return_probability=True)
    vader_scores = analyzer.polarity_scores(text)
    compound_score = vader_scores["compound"]
    sentiment_label = classify_sentiment(compound_score)
    result = {
        "emotion": tweetnlp_result,
        "sentiment": {
            "neg": vader_scores["neg"],
            "neu": vader_scores["neu"],
            "pos": vader_scores["pos"],
            "compound": compound_score,
            "label": sentiment_label
        }
    } 

    with open("emotion_result.json", "a") as f:
        data = {
            "time": time,
            "text": text,
            "result": result
        }
        json.dump(data, f)
        f.write("\n")

    sentence_results = analyze_sentence(text, time)
    with open("sentence_emotion_result.json", "a") as f:
        for result in sentence_results:
            json.dump(result, f)
            f.write("\n")

    return result

@app.post("/analyze")
def analyze_text(item: Item):
    print("Received request:", item) # 新增打印语句
    text = item.text
    time = item.time
    result = perform_emotion_analysis(text, time)
    print("Analysis result:", result) # 新增打印语句
    return {"text": text, "result": result}


@app.get("/sentiment/emotion_result.json")
def get_results():
    try:
        with open("emotion_result.json", "r") as f:
            data = [json.loads(line) for line in f]
        return JSONResponse(content=data)
    except Exception as e:
        print(e)  # 打印错误到控制台
        return JSONResponse(content={"error": str(e)}, status_code=500) # 返回错误到客户端


@app.get("/sentiment/sentence_emotion_result.json")
def get_sentence_results():
    with open("sentence_emotion_result.json", "r") as f:
        data = [json.loads(line) for line in f]
    return JSONResponse(content=data)

import nltk
nltk.download('stopwords')
nltk.download('punkt')
