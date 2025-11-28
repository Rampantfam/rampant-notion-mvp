export default function Page(){
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Rampant Portal Style Test</h1>
      <p className="text-gray-600">
        If you see this page styled with spacing, black text, and white background, Tailwind and Inter font are working.
      </p>
      <button className="bg-orange-500 text-white rounded-md px-4 py-2 hover:bg-orange-600 transition-all">
        Test Button
      </button>
    </div>
  );
}

