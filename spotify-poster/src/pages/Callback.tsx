import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { spotify } from "../spotify";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    spotify
      .authenticate()
      .then(() => navigate("/"))
      .catch((err) => {
        console.error("Auth failed", err);
        navigate("/");
      });
  }, [navigate]);

  return <div>Authorizing...</div>;
}
