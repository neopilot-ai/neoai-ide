import { Metadata } from "next";
import Main from "@/components/customer-insights/main";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Customer Insights",
  description: "Analyze how we can improve customer experience",
};

export default function CustomerInsights() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <Navbar showSettings={false} />
      <Main />
      {/* <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Customer Insights Report Builder
        </h1>
        <Main />
      </main> */}
    </div>
  );
}
