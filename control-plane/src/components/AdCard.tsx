import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface AdCardProps {
  icon: string;
  title: string;
  label: string;
  imageSrc: string;
  imageAlt: string;
  description: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
}

export function AdCard({
  icon,
  title,
  label,
  imageSrc,
  imageAlt,
  description,
  subtitle,
  buttonText,
  buttonHref,
}: AdCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <h3 className="font-semibold">{title}</h3>
          </div>
          <span className="text-xs">{label}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-shrink-0">
          <Image src={imageSrc} alt={imageAlt} width={100} height={100} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-gray-700 break-keep">
              {description}
            </p>
            <p className="text-sm text-gray-600 break-keep">{subtitle}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={buttonHref} target="_blank">
            {buttonText}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
