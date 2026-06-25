import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { spotify } from "../spotify";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function run() {
      try {
        await spotify.authenticate();

        // IMPORTANT: go to protected page, not login
        navigate("/poster");
      } catch (err) {
        console.error("Auth failed", err);
        navigate("/");
      }
    }

    run();
  }, []);

  return <div>Authorizing...</div>;
}