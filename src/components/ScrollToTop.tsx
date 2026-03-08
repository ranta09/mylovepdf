import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const scrollPositions = new Map<string, number>();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Save scroll position of the page we're leaving
    scrollPositions.set(prevPathname.current, window.scrollY);
    prevPathname.current = pathname;

    // Restore position on POP (back/forward), scroll top on PUSH
    if (navigationType === "POP" && scrollPositions.has(pathname)) {
      window.scrollTo(0, scrollPositions.get(pathname)!);
    } else if (navigationType !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
