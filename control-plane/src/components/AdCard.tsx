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
    <Card className="w-full bg-white border-2 border-gray-300 ">
      <CardHeader className="bg-gray-100 border-b border-gray-300 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl p-2 bg-white rounded border border-gray-300">
              {icon}
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          </div>
          <span className="text-xs bg-gray-200 text-gray-600 border border-gray-300 px-2 py-1 rounded">
            {label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
        <div className="flex-shrink-0">
          <div className="p-2 bg-white border border-gray-300 rounded">
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={100}
              height={100}
              className="hover:opacity-90 transition-opacity"
            />
          </div>
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
      <CardFooter className="p-6 pt-0">
        <Button
          asChild
          className="w-full bg-gray-600 hover:bg-gray-700 text-white border border-gray-400 font-medium"
        >
          <Link href={buttonHref} target="_blank">
            {buttonText}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
