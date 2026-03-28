import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#fdf8f3]">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <div className="text-5xl mb-3">🌸</div>
          <h1 className="text-3xl font-bold text-[#2d2416] leading-tight">
            Exie&apos;s Care Circle
          </h1>
          <p className="mt-2 text-[#6b5740] text-base">
            Coordinating visits with love
          </p>
        </div>

        {/* Entry buttons */}
        <div className="w-full flex flex-col gap-4">
          <Link
            href="/exie"
            className="w-full bg-[#e8a87c] hover:bg-[#d9976a] active:bg-[#c98659] text-white text-center text-xl font-semibold py-5 rounded-2xl shadow-sm transition-colors"
          >
            I&apos;m Exie 👵
          </Link>
          <Link
            href="/volunteer"
            className="w-full bg-[#7aab8a] hover:bg-[#699978] active:bg-[#598768] text-white text-center text-xl font-semibold py-5 rounded-2xl shadow-sm transition-colors"
          >
            I&apos;m a Volunteer 🤝
          </Link>
        </div>
      </div>
    </main>
  );
}
