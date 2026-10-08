import Spinner from "./ui/Spinner";

export default function Loader() {
  return (
    <div className="flex justify-center p-5">
      <Spinner size="lg" />
    </div>
  );
}
