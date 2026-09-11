import os
import json
import base64
import streamlit as st
import google.generativeai as genai
from PIL import Image

# Page configuration
st.set_page_config(
    page_title="WellUP — Youth Health Awareness",
    page_icon="public/favicon.svg",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling to match WellUP Design System
st.markdown("""
<style>
    :root {
        --primary: #10b981;
        --primary-dark: #059669;
        --surface: #ffffff;
        --text: #18201e;
    }
    .main {
        background-color: #fcfbf9;
        font-family: 'Inter', -apple-system, sans-serif;
    }
    .wellup-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        margin-bottom: 20px;
    }
    .sdg-badge {
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }
    .stChatMessage {
        border-radius: 18px;
        padding: 12px;
    }
    .report-card {
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 16px;
    }
</style>
""", unsafe_allow_html=True)

# API Key resolution
API_KEY = (
    st.secrets.get("GEMINI_API_KEY")
    or os.environ.get("GEMINI_API_KEY")
    or "AIzaSyBdTzKU6xJG4UQUyi4fnFOjR87LcrSqGKg"
)
genai.configure(api_key=API_KEY)

SYSTEM_PROMPT = """You are WellUP — a warm, knowledgeable health guide who talks to teenagers and young adults like a trusted older friend who knows a lot about health.
- Warm, real, conversational. Never say "As an AI language model..."
- Direct answer first, then practical actionable context.
- Zero clinical jargon without immediate plain-language translation.
- If medical term is introduced, format: [HEALTH_WORD: term | definition | function | location | related]
- Strict Safety: Never diagnose or prescribe dosages. For chest pain/emergencies, recommend 112/108."""

# Header
col1, col2 = st.columns([8, 2])
with col1:
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 12px;">
        <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800; color: #10b981;">WellUP</h1>
        <span class="sdg-badge">UN SDG 3: Good Health & Well-being</span>
    </div>
    <p style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">
        Private, stigma-free adolescent and young adult health awareness platform.
    </p>
    """, unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.image("public/favicon.svg", width=54)
    st.title("WellUP Guide")
    
    language = st.selectbox(
        "Preferred Language",
        ["English", "Hindi (हिन्दी)", "Gujarati (ગુજરાતી)"],
        index=0
    )
    lang_code = "hi" if "Hindi" in language else "gu" if "Gujarati" in language else "en"

    st.subheader("💡 Topics to Ask")
    topics = [
        "Why do period cramps happen and what relieves them fast?",
        "How can I fix my sleep cycle and stop waking up tired?",
        "Exercises to fix neck & shoulder pain from long laptop hours",
        "What should I eat daily for consistent physical and mental energy?",
        "Quick breathing techniques to stop stress and overthinking",
        "Is it true that you shouldn't exercise or shower during periods?"
    ]
    for t in topics:
        if st.button(t, key=f"topic_{t[:15]}", use_container_width=True):
            st.session_state.current_prompt = t

    st.markdown("---")
    st.subheader("📄 Medical Report Assistant")
    uploaded_file = st.file_uploader(
        "Upload PDF or Photo (Lab Report, Prescription, Vitals)",
        type=["pdf", "png", "jpg", "jpeg"]
    )

    if uploaded_file:
        st.success(f"Loaded: {uploaded_file.name}")
        if st.button("Analyze Medical Document", type="primary", use_container_width=True):
            with st.spinner("Extracting clinical data with Gemini Multimodal AI..."):
                try:
                    file_bytes = uploaded_file.read()
                    mime_type = uploaded_file.type or ("application/pdf" if uploaded_file.name.endswith(".pdf") else "image/jpeg")
                    
                    model = genai.GenerativeModel("gemini-flash-lite-latest")
                    prompt = """Analyze this medical document. Return a clean JSON:
                    {
                      "summary": "Plain language 2-3 sentence overview",
                      "facts": [{"label": "test or item", "value": "finding"}],
                      "appointment": "follow-up date if found or null"
                    }"""
                    
                    res = model.generate_content([
                        {"mime_type": mime_type, "data": file_bytes},
                        prompt
                    ])
                    text = res.text
                    clean_json = text[text.find("{"):text.rfind("}")+1]
                    report_data = json.loads(clean_json)
                    
                    st.session_state.last_report = report_data
                    st.session_state.last_report_name = uploaded_file.name
                except Exception as e:
                    st.error(f"Analysis error: {e}")

    st.markdown("---")
    st.caption("🚨 Emergency Services: 112 or 108 (India)")

# Display Analyzed Report if present
if "last_report" in st.session_state and st.session_state.last_report:
    rep = st.session_state.last_report
    with st.expander(f"📄 Analyzed Report: {st.session_state.get('last_report_name', 'Document')}", expanded=True):
        st.markdown(f"**Plain Language Summary:**\n\n{rep.get('summary', '')}")
        if rep.get("appointment"):
            st.info(f"📅 **Detected Follow-up Appointment:** {rep['appointment']}")
        
        facts = rep.get("facts", [])
        if facts:
            st.markdown("**Key Health Facts:**")
            for f in facts:
                st.markdown(f"- **{f.get('label')}:** {f.get('value')}")
        
        if st.button("Discuss this report in Chat", key="btn_discuss"):
            st.session_state.current_prompt = f"Can you explain the medical report findings in detail? Summary: {rep.get('summary')}"

# Chat State Initialization
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Hey! 👋 I'm WellUP, your private health guide. Ask me anything about your body, periods, nutrition, sleep, posture, or stress. What's on your mind today?"}
    ]

# Render Message History
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# User Input Handling
prompt = st.chat_input("Ask about your body, symptoms, nutrition, periods, sleep...")

if "current_prompt" in st.session_state and st.session_state.current_prompt:
    prompt = st.session_state.current_prompt
    st.session_state.current_prompt = None

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("WellUP is thinking..."):
            try:
                model = genai.GenerativeModel(
                    "gemini-flash-lite-latest",
                    system_instruction=SYSTEM_PROMPT
                )
                
                lang_instruction = ""
                if lang_code == "hi":
                    lang_instruction = "Respond warmly in Hindi. "
                elif lang_code == "gu":
                    lang_instruction = "Respond warmly in Gujarati. "
                    
                full_query = f"{lang_instruction}{prompt}"
                response = model.generate_content(full_query)
                answer = response.text
                
                # Clean health words markup for reader
                clean_answer = answer.replace("<thought>", "").replace("</thought>", "")
                st.markdown(clean_answer)
                st.session_state.messages.append({"role": "assistant", "content": clean_answer})
            except Exception as e:
                err_text = "I'm having a brief connection delay. For any urgent health concerns, please consult a healthcare professional."
                st.markdown(err_text)
                st.session_state.messages.append({"role": "assistant", "content": err_text})
