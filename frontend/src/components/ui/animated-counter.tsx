import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  previousValue?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  showTrend?: boolean;
  formatNumber?: boolean;
}

export const AnimatedCounter = ({ 
  value, 
  previousValue, 
  duration = 1000,
  prefix = "",
  suffix = "",
  className = "",
  showTrend = true,
  formatNumber = true
}: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const updateCounter = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (difference * easeOut));

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value, duration]);

  // Calcular trend
  const trend = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositiveTrend = trend > 0;
  const isNegativeTrend = trend < 0;

  const formatDisplayValue = (val: number) => {
    if (!formatNumber) return val.toString();
    return val.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-2">
      <div className={cn("font-bold transition-all duration-300", className, {
        "animate-pulse": isAnimating
      })}>
        {prefix}{formatDisplayValue(displayValue)}{suffix}
      </div>
      
      {showTrend && previousValue && (
        <div className="flex items-center text-sm">
          {isPositiveTrend && (
            <>
              <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-green-400">+{Math.abs(trend).toFixed(1)}%</span>
            </>
          )}
          {isNegativeTrend && (
            <>
              <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
              <span className="text-red-400">-{Math.abs(trend).toFixed(1)}%</span>
            </>
          )}
          {trend === 0 && (
            <span className="text-gray-400">sem alteração</span>
          )}
          <span className="text-gray-400 ml-1">vs período anterior</span>
        </div>
      )}
    </div>
  );
}; 