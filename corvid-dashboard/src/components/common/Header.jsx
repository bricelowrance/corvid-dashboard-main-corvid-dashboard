const Header = ({ title }) => {
  return (
    <header className="bg-white bg-opacity-100 backdrop-blur-md shadow-lg border-b border-gray-700">
        <div className="mx-auto py-4 sm:px-6 lg:px-8 flex items-center">
            <h1 className="text-2xl font-semibold text-corvid-blue">{title}</h1>
            <img
                src="/CorvidLogo_Blue.png"
                alt="Logo"
                className="h-8 w-auto ml-auto"
            />
        </div>

    </header>
  )
}

export default Header