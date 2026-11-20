import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/images/Logolong.png"
        alt="L'espace des deux rives"
        className="h-12"
      />
    </Link>
  );
}