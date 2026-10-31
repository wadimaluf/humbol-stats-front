import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FLOW = [
  {
    step: "1",
    title: "Subir partido",
    description: "MP4 o link de YouTube, con la marca de kickoff dentro del video.",
  },
  {
    step: "2",
    title: "Verificar cancha",
    description: "Validá el recorte y la región de interés detectada por el motor.",
  },
  {
    step: "3",
    title: "Asignar equipos",
    description: "Agrupá por arrastrar-y-soltar los 10 jugadores detectados.",
  },
  {
    step: "4",
    title: "Analizar estadísticas",
    description: "Distancia, velocidades, sprints, cobertura y mapas de calor.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Estadísticas de tu partido, <span className="text-primary">automáticas</span>
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Subí el video de tu partido de fútbol 5/6 y el motor de visión por
          computadora genera rendimiento físico por jugador: distancia,
          velocidad, sprints y mapas de calor.
        </p>
        <Button size="lg" className="mt-2" render={<Link href="/partidos/nuevo" />}>
          Subir un partido
        </Button>
      </div>

      <ol className="grid w-full gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map((item) => (
          <li key={item.step}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                    {item.step}
                  </span>
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
