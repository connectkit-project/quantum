interface SwitchIconProps {
  className: string;
  size: number;
}

export function SwitchIcon({
  className,
  size = 24,
}: SwitchIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.99523 15.5528C3.70219 15.2601 3.22732 15.2603 2.93456 15.5533C2.64181 15.8463 2.64204 16.3212 2.93507 16.614L7.34277 21.0175C7.48035 21.1811 7.68658 21.2851 7.91709 21.2851C7.91778 21.2851 7.91846 21.2851 7.91915 21.2851C7.91992 21.2851 7.92069 21.2851 7.92146 21.2851C8.12038 21.285 8.3111 21.2059 8.45169 21.0652L12.8992 16.6135C13.1919 16.3204 13.1917 15.8456 12.8987 15.5528C12.6057 15.2601 12.1308 15.2603 11.838 15.5533L8.66709 18.7273L8.66709 10.5187C8.66709 10.1045 8.33131 9.76873 7.91709 9.76873C7.50288 9.76873 7.16709 10.1045 7.16709 10.5187L7.16709 18.7217L3.99523 15.5528ZM19.6291 8.8242C19.9222 9.11695 20.397 9.11673 20.6898 8.8237C20.9826 8.53066 20.9823 8.05579 20.6893 7.76304L16.2813 3.35919C16.1437 3.19574 15.9376 3.09189 15.7072 3.09189L15.7052 3.09189L15.7029 3.09189C15.504 3.09198 15.3133 3.17109 15.1727 3.31181L10.7252 7.76354C10.4324 8.05657 10.4326 8.53145 10.7257 8.8242C11.0187 9.11696 11.4936 9.11673 11.7863 8.8237L14.9572 5.6498L14.9572 13.8583C14.9572 14.2725 15.293 14.6083 15.7072 14.6083C16.1214 14.6083 16.4572 14.2725 16.4572 13.8583L16.4572 5.65529L19.6291 8.8242Z"
        className={className}
      />
    </svg>
  );
}
