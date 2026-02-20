export async function verifyTurnstile(token: string, secretKey: string, ip?: string): Promise<boolean> {
  if (!token) {
    return false;
  }
  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  try {
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = (await result.json()) as { success: boolean };
    return outcome.success;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}
