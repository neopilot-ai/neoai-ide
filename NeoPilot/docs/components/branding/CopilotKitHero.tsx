import Image from "next/image";

export const NeoPilotHero = () => (
  <div className="flex justify-center relative overflow-hidden mb-16 rounded-3xl pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-60"></div>
    <div className="relative z-10 p-12 transform transition-all duration-300">
      <Image src={"https://cdn.neopilot.ai/docs/neopilot/neopilot-logo-dark.png"} width={400} height={100} alt="NeoPilot Logo" />
    </div>
  </div>
)