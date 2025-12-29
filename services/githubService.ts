
import { UserData } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

interface GithubResponse {
  content?: string;
  sha?: string;
  message?: string;
}

export const verifyToken = async (token: string, username: string): Promise<boolean> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.login.toLowerCase() === username.toLowerCase();
  } catch (error) {
    console.error('GitHub Auth Check Failed:', error);
    return false;
  }
};

export const fetchUserData = async (
  token: string, 
  repo: string, 
  username: string
): Promise<{ data: UserData | null; sha?: string; repoExists?: boolean }> => {
  const path = `users/${username}/data.json`;
  
  try {
    // 1. Check if Repo Exists
    const repoResponse = await fetch(`${GITHUB_API_BASE}/repos/${repo}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (repoResponse.status === 404) {
        return { data: null, repoExists: false };
    }

    // 2. Fetch File
    const response = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store'
    });

    if (response.status === 404) {
      // Repo exists, but file doesn't. Return null data so we can create it later.
      return { data: null, repoExists: true };
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const json: GithubResponse = await response.json();
    if (json.content && json.sha) {
      // Content is base64 encoded
      const decodedContent = atob(json.content.replace(/\n/g, ''));
      const parsedData = JSON.parse(decodedContent);
      return { data: parsedData, sha: json.sha, repoExists: true };
    }

    return { data: null, repoExists: true };
  } catch (error) {
    console.error('Fetch User Data Error:', error);
    throw error;
  }
};

export const createRepository = async (token: string, repoName: string): Promise<boolean> => {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: repoName,
                description: 'InStock Terminal User Data Store',
                private: true, // Default to private for security
                auto_init: true
            })
        });
        
        return response.ok;
    } catch (e) {
        console.error("Failed to create repo", e);
        return false;
    }
}

export const saveUserData = async (
  token: string,
  repo: string,
  username: string,
  data: UserData,
  sha?: string
): Promise<{ success: boolean; newSha?: string }> => {
  const path = `users/${username}/data.json`;
  const content = btoa(JSON.stringify(data, null, 2));
  
  const body: any = {
    message: `Update data for ${username} - ${new Date().toISOString()}`,
    content: content,
  };

  if (sha) {
    body.sha = sha;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Save Error:', err);
      return { success: false };
    }

    const resJson = await response.json();
    return { success: true, newSha: resJson.content.sha };
  } catch (error) {
    console.error('Save User Data Exception:', error);
    return { success: false };
  }
};
