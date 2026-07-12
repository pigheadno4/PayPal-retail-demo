import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";

export interface BuyerSafeImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt"
> {
  readonly alt: string;
  readonly fallbackClassName?: string | undefined;
}

export function BuyerSafeImage({
  alt,
  fallbackClassName,
  onError,
  src,
  ...imageProps
}: BuyerSafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <span
        aria-label={`${alt} unavailable`}
        className={fallbackClassName}
        data-image-fallback="true"
        role="img"
      >
        <span aria-hidden="true">Image unavailable</span>
      </span>
    );
  }

  return (
    <img
      {...imageProps}
      alt={alt}
      src={src}
      onError={(event: SyntheticEvent<HTMLImageElement>) => {
        onError?.(event);
        setFailed(true);
      }}
    />
  );
}
