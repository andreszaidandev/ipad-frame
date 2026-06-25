import { useEffect } from "react";
import { spotify } from "../spotify";

export default function Callback() {
  useEffect(() => {
    spotify.authenticate().then(() => {
      window.location.href = "/";
    });
  }, []);

  return <div>Authorizing...</div>;
}