// src/dev.ts
import env from "./env";
import { app } from "./index";



const PORT = Number(env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
