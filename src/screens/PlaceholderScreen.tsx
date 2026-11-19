interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
}

export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="card placeholder-card">
        <h3>Ready for Step 4</h3>
        <p>
          Routing and local database plumbing are active. This screen will be
          converted from the prototype in the next implementation phase.
        </p>
      </div>
    </section>
  );
}
