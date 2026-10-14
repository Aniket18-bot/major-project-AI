# Smart Hire AI

AI-Based Recruitment decision system

this is the application where Recruitment will done using AI.

there will be two interface that is student login and recruiter login both will be having different interface with the different features.

Student interface:-

    1.this interface will contain where student will be applying for jobs they want .

    2.student will be uploading the resumes or create new resumes by using AI by giving the details and AI will make them ATS friendly resumes, or they can connect linkedln or give the full details of there profile in pdf format and AI will make them ATS friendly resumes.

    3.there should be student profile in the application where they can add details of there qualification, achievement, certificate, projects, resumes etc. so that if recruiter want to known more about that student they can see there profile.

    4.when student will be applying for the job the resume and details will be uploaded according to the job description.

    5.there will be single resume but sometime there will different job description and student want to apply to that job then our AI will be helping student to modify the resume according to the job description if student have skills or qualification to that job.

    6.student will be having there dashboard(track job) where they can see the all job applied and the status of the job like selected, rejected, hold and on which phase of the process they are on and also the explanation(by AT or recruiter) to there status like if they are rejected why they are rejected and if they are on hold why they are on hold and if they are selected then how they get selected.

    7.every student will be having there personalized AI chatbot where they can ask anything about the jobs, and for particular job what they are missing or where they can improve themselves, this chatbot will help them with everything applying for job , improving the profile and what to learn so that they can get job etc. and there chatbot will known everything about them.

Recruiter interface:-

    1.this interface will contain where the recruiter will upload the jobs .

    2.here the jobs will be being upload with the description and students can apply for same.

    3.recruiter will also have there profile where they be having there details with the company details.

    4.recruiter will be having the personalized AI chatbot where they can ask anything and chatbot will known everything about them.

    5.they will be having the dashboard where they can see the details of the hired people and there progress they can have several charts about the progress. Applications, Jobs Posted, Average Score, Top Skills, Hiring Funnel, Acceptance Rate, Rejected %, Pending %,Graphs

Bar Chart

Pie Chart

Line Chart

    6.there should different dashboard of ranking, automated candidate scoring in specific job section because when there will be multiple roles then more students will be there, so there will different dashboard for every job role.

Pages:-

Candidate:-

Login

Register

Dashboard

Upload Resume

Available Jobs

My Applications

Profile

Recruiter:-

Login

Dashboard

Post Job

Applicants

Candidate Details

Analytics

above is the just basic need below is all features list but insure i want all the features which is above and below.

Key Features of the Proposed System:

• Resume Upload Portal for candidates

• NLP-based Resume Parsing Engine

• Semantic Job Description Matching

• Automated Candidate Scoring System

• Smart Ranking Dashboard for recruiters

• Bias Reduction and Fairness Module

• Explainable AI for decision transparency

• Hiring Analytics and Reporting

• Automated Email Notification System

1.4 Objectives of the Project

Primary Objectives:

• To automate the recruitment and resume screening process

• To reduce recruiter workload and overall hiring time

• To improve candidate-job matching accuracy

• To eliminate human bias in initial candidate screening

Technical Objectives:

• To implement NLP-based resume parsing and information extraction

• To develop semantic similarity matching algorithms

• To create an intelligent candidate scoring and ranking system

• To develop a recruiter analytics and reporting dashboard

Ethical Objectives:

• To support fair and transparent recruitment practices

• To improve explainability of AI-based hiring decisions

🟢 1. CORE FEATURES (Must Have ✅)

1️⃣ Resume Upload & Management

What it does:

Candidates upload resumes (PDF/DOCX)

Stored in database

Why important:

Entry point of system

2️⃣ Resume Parser (NLP-Based)

What it does:

Extracts:

Skills

Education

Experience

Projects

How:

SpaCy / NLTK

Benefit:

👉 Converts unstructured resume → structured data

3️⃣ Job Description Input

What it does:

Recruiter uploads job requirements

Extracts:

Required skills

Experience level

4️⃣ Resume–JD Matching Engine

What it does:

Compares resume with job description

Tech:

TF-IDF / Sentence Transformers

Cosine Similarity

Output:

👉 Match %

5️⃣ Candidate Scoring System

What it does:

Generates final score

Example:

Skill Match → 40%

Experience → 25%

👉 Output:

“Suitability Score = 82%”

6️⃣ Candidate Ranking Dashboard

What it does:

Sorts candidates automatically

Shows:

Top candidates

Low-score candidates

7️⃣ Recruiter Dashboard

What it does:

Manage job postings

View candidates

Filter applicants

🟡 2. INTERMEDIATE FEATURES (Very Important ⭐)

8️⃣ Bias Reduction Module

What it does:

Ignores:

Name

Gender

Location

👉 Ensures fair evaluation

9️⃣ Explainable AI (XAI)

What it does:

Shows:

Why candidate got score

Example:

“Score high due to Python + ML experience”

👉 Using:

SHAP / Feature weights

🔟 Skill Gap Analysis

What it does:

Shows missing skills

Example:

“Missing: Docker, AWS”

👉 Very useful for recruiters

1️⃣1️⃣ Interview Recommendation System

What it does:

Suggests:

Shortlist

Reject

Hold

1️⃣2️⃣ Auto Interview Questions Generator

What it does:

Generates questions based on skills

Example:

If skill = Python → ask Python questions

1️⃣3️⃣ Candidate Filtering System

What it does:

Filters by:

Score

Experience

Skills

1️⃣4️⃣ Resume Duplicate Detection

What it does:

Detects duplicate resumes

👉 Prevents spam applications

🔵 3. ADVANCED FEATURES (🔥 High Impact)

1️⃣5️⃣ Semantic Matching (Transformer-Based)

What it does:

Understands meaning, not just keywords

Example:

“ML” = “Machine Learning”

👉 Using:

sentence-transformers

1️⃣6️⃣ Multilingual Resume Support

What it does:

Supports:

English

Hindi

Kannada

👉 Use:

Translation APIs

1️⃣7️⃣ Resume Improvement Suggestions

What it does:

Suggests:

Add skills

Improve formatting

👉 Useful for candidates

1️⃣8️⃣ Hiring Analytics Dashboard

What it shows:

Top skills

Hiring trends

Candidate distribution

👉 Helps recruiters take decisions

1️⃣9️⃣ Email Notification System

What it does:

Sends:

Shortlisted mail

Rejected mail

👉 Using SMTP

2️⃣0️⃣ Real-Time Processing (Async)

What it does:

Handles multiple resumes

👉 Using:

FastAPI async

Celery / Redis

🟣 4. PRO FEATURES

2️⃣1️⃣ Candidate Portal

What it does:

Apply for jobs

Track status

2️⃣3️⃣ Job Recommendation for Candidates

What it does:

Suggest jobs based on resume

2️⃣4️⃣ AI Chatbot (HR Assistant)

What it does:

Answers:

Job queries

Application status

2️⃣5️⃣ Interview Scheduling System

What it does:

Schedule interviews automatically

2️⃣6️⃣ LinkedIn Profile Analyzer

What it does:

Extracts data from LinkedIn

2️⃣7️⃣ Resume Scoring Benchmark

What it does:

Compare candidate with others

Example:

“Top 10% candidate”

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/260eb060-eb93-4ee8-ae9c-9a018b98d5a7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
