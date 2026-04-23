import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

const NotFound = () => {
  return (
    <div
      className="flex min-h-screen items-center justify-center flex-col p-4"
      data-testid="not-found"
    >
      <div className="flex items-center z-10">
        <div className="flex flex-col ml-4 items-center justify-center p-4">
          <span className="text-6xl md:text-8xl font-bold leading-none mb-4">
            404
          </span>
          <span className="text-2xl font-bold mb-2">Page not found</span>
        </div>
      </div>

      <p className="text-lg text-muted-foreground mb-4 text-center z-10">
        This route does not exist. Choose where you want to continue.
      </p>
      <div className="z-10 flex flex-wrap items-center justify-center gap-3">
        <Link to="/dashboard">
          <Button className="mt-2">Go to dashboard</Button>
        </Link>
        <Link to="/auth/login">
          <Button variant="outline" className="mt-2">
            Go to login
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default NotFound
