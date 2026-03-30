import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-[24px] bg-[#fdf8f3]">
      <div className="w-full max-w-[342px] flex flex-col items-center gap-12">

        {/* Lockup */}
        <div className="flex flex-col items-center gap-[5px] text-center w-full">
          <span className="text-[52px] leading-none">🌸</span>
          <p className="font-[family-name:var(--font-crimson-pro)] font-normal text-[36px] text-[#2d2416]">
            Exie&#8217;s Care Circle
          </p>
          <p className="font-[family-name:var(--font-raleway)] font-medium text-[17px] text-[#988b7e]">
            Coordinating visits with love
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-4">
          <Link
            href="/exie"
            className="w-full h-16 flex items-center justify-center bg-[#e8a87c] hover:bg-[#d9976a] active:bg-[#c98659] text-white font-[family-name:var(--font-crimson-pro)] font-normal text-[24px] rounded-[16px] transition-colors"
          >
            I&#8217;m Exie
          </Link>
          <Link
            href="/volunteer"
            className="w-full h-16 flex items-center justify-center bg-[#7aab8a] hover:bg-[#699978] active:bg-[#598768] text-white font-[family-name:var(--font-crimson-pro)] font-normal text-[24px] rounded-[16px] transition-colors"
          >
            I&#8217;m a Volunteer
          </Link>
        </div>

      </div>
    </main>
  );
}
