import { PromptFamily } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"; // In production, get from auth/session

export async function fetchPromptFamilies(
  userId: string = DEFAULT_USER_ID,
  agentId: string
): Promise<PromptFamily[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts/agent/${agentId}`, {
      headers: {
        "X-User-ID": userId,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Failed to fetch prompt families: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching prompt families:", error);
    return [];
  }
}

export async function fetchPromptVersions(
    userId: string = DEFAULT_USER_ID,
    prompt_name: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/prompts/${prompt_name}/versions`, {
          headers: {
            "X-User-ID": userId,
          },
          cache: "no-store",
        });
    
        if (!response.ok) {
          console.error(`Failed to fetch prompt versions: ${response.statusText}`);
          return [];
        }
    
        const data = await response.json();
        return data.versions || [];
      } catch (error) {
        console.error("Error fetching agents:", error);
        return [];
    }
}

export async function fetchPromptContent(userId: string = DEFAULT_USER_ID, prompt_name: string, versionId: number) {
    try {
        const response = await fetch(`${API_BASE_URL}/prompts/${prompt_name}/content?version_number=${versionId}`, {
            headers: {
              "X-User-ID": userId,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            console.error(`Failed to fetch prompt versions: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data.content || [];
    } catch (error) {
        console.error("Error fetching prompt content", error);
        return [];
    }
}

export async function fetchPromptDiff(userId: string = DEFAULT_USER_ID, version_number1: number, version_number2: number) {
    const url = new URL(`${API_BASE_URL}/prompts/diff`);
    url.searchParams.set("prompt_id1", String(version_number1));
    url.searchParams.set("prompt_id2", String(version_number2));

    try {
        const response = await fetch(url.toString(), {
            headers: {
                "X-User-ID": userId,
            },
            cache: "no-store",
        });

        if (!response.ok) {
        console.error(`Failed to fetch prompt diff: ${response.statusText}`);
        return [];
        }

        const data = await response.json();
        return data.diff || [];
    } catch (error) {
        console.error("Error fetching prompt differences", error);
        return [];
    }
}

export async function rollbackPrompt(
    userId: string = DEFAULT_USER_ID,
    name: string,
    versionNumber: number
  ) {
    // URL: /prompts/{name}/rollback?version_number=3
    const url = new URL(`${API_BASE_URL}/prompts/${encodeURIComponent(name)}/rollback`);
    url.searchParams.set("version_number", String(versionNumber));
  
    try {
      const response = await fetch(url.toString(), {
        method: "POST",                    
        headers: {
          "X-User-ID": userId,
        },
        cache: "no-store",
      });
  
      if (!response.ok) {
        console.error(`Failed to rollback prompt: ${response.statusText}`);
        return null;                       
      }
  
      const data = await response.json();
      return data;                        
    } catch (error) {
      console.error("Error rolling back prompt", error);
      return null;
    }
}
  