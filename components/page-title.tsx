interface PageTitleProps {
  title: string;
  description?: string;
  externalLink?: {
    title: string;
    url: string;
  }[];
}

export default function PageTitle({
  title,
  description,
  externalLink,
}: PageTitleProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-col items-start gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-default-500">{description}</p>
        )}
      </div>

      {externalLink?.length && (
        <div className="flex gap-6 text-xs text-primary">
          {externalLink.map((item) => (
            <a
              key={item.title}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {item.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
