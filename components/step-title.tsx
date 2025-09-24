interface StepTitleProps {
  title: string;
  description: string;
  step?: number;
}

export default function StepTitle({
  title,
  description,
  step,
}: StepTitleProps) {
  return (
    <div className="p-3 bg-primary-50 rounded-lg relative flex justify-between items-center">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-xs text-default-500">{description}</p>
      </div>
      {!!step && <p className="text-primary-200 text-4xl font-bold">{step}</p>}
    </div>
  );
}
