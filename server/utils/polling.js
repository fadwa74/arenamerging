const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const pollJob = async (public_id, maxAttempts = 60) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Polling ${public_id} attempt ${i + 1}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://api.edenai.run/v3/universal-ai/async/${public_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EDEN_API_KEY}`
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeout);
      console.log("POLL STATUS:", res.status);

      if (!res.ok) throw new Error(`Eden AI error: ${res.status}`);

      const data = await res.json();
      console.log("JOB STATUS:", data.status);

      switch (data.status) {
        case "success":
          return data.output;

        case "fail":
          throw new Error(data.error?.message || "Job failed");

        default:
          console.log(`Job still processing: ${data.status}`);
      }

    } catch (error) {
      console.error("POLLING ERROR:", error.message, error.cause);
      throw error;
    }
    await delay(4000);
  }

  throw new Error(`Polling timed out after ${maxAttempts} attempts for job ${public_id}`);
};
