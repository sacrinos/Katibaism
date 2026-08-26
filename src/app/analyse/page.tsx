import { UploadForm } from "@/components/UploadForm";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata = {
  title: "Analyse a Bill",
};

export default function AnalysePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <UploadForm />
      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
