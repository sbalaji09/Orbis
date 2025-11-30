import os
from openai import OpenAI
from prompts.prompt_versions_prompt import build_prompt_evaluator

# call LLM to analyze and compare two prompt versions
def get_llm_comparison_analysis(
    prompt1_content: str,
    prompt2_content: str,
    outputs1: list[str],
    outputs2: list[str],
    analytics1: dict,
    analytics2: dict,
    model_a: str = "unknown",
    model_b: str = "unknown"
) -> str:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Join outputs into single strings for the evaluator
    output_a = "\n---\n".join(outputs1) if outputs1 else "No outputs available"
    output_b = "\n---\n".join(outputs2) if outputs2 else "No outputs available"

    # Build the evaluation prompt with all data injected
    evaluation_prompt = build_prompt_evaluator(
        prompt_a=prompt1_content,
        prompt_b=prompt2_content,
        output_a=output_a,
        output_b=output_b,
        analytics_a=analytics1,
        analytics_b=analytics2,
        model_a=model_a,
        model_b=model_b
    )

    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "user", "content": evaluation_prompt}
        ],
        temperature=0.3
    )

    return response.choices[0].message.content