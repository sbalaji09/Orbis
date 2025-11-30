import os
from openai import OpenAI
from prompts.prompt_versions_prompt import build_prompt_evaluator

# calls gpt-5 to analyze two prompt versions
def get_llm_comparison_analysis(
    prompt1_content: str,
    prompt2_content: str,
    outputs1: list[str],
    outputs2: list[str],
    analytics1: dict,
    analytics2: dict,
    model_a: str,
    model_b: str,
    evaluation_prompt: str
) -> str:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    user_message = build_prompt_evaluator(prompt1_content, prompt2_content, outputs1, outputs2, analytics1, analytics2, model_a, model_b)

    response = client.chat.completions.create(
        model="gpt-5-mini",  # or your preferred model
        messages=[
            {"role": "system", "content": evaluation_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.3  # lower for more consistent analysis
    )
    
    return response.choices[0].message.content