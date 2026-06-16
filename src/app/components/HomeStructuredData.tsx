type HomeStructuredDataProps = {
  data: Record<string, unknown>;
};

export default function HomeStructuredData({ data }: HomeStructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
