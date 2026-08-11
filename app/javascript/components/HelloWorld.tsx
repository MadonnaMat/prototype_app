import { Button } from "./ui/button"

type HelloWorldProps = {
  name: string
}

export default function HelloWorld({ name }: HelloWorldProps) {
  return (
    <div>
      <h1>Hello, {name}! React 19 is rendering this component.</h1>
      <Button>shadcn Button</Button>
    </div>
  )
}
