const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const pollJob = async (public_id, maxAttempts = 240) => {

  for (let i = 0; i < maxAttempts; i++) {

    try {

      console.log(
        `🔄 Polling ${public_id} attempt ${i + 1}`
      );

      const res = await fetch(
        `https://api.edenai.run/v3/universal-ai/async/${public_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EDEN_API_KEY}`
          }
        }
      );


      console.log(
        "POLL STATUS:",
        res.status
      );


      if (!res.ok) {
        throw new Error(
          `Eden AI error: ${res.status}`
        );
      }


      const data = await res.json();


      console.log(
        "POLL RESPONSE:",
        JSON.stringify(data, null, 2)
      );


      if (data.status === "success") {
        return data.output;
      }


      if (data.status === "fail") {
        throw new Error(
          data.error?.message || "Job failed"
        );
      }


    } catch(error) {

      console.error(
        "❌ POLLING ERROR:",
        error.message,
        error.cause
      );

      throw error;

    }


    await delay(4000);
  }


  throw new Error("Polling timed out");
};