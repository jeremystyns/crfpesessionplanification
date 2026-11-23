import { Toaster as Sonner } from "@/components/primitives/sonner";
import { TooltipProvider } from "@/components/primitives/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, useLocation, Outlet, useNavigation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Suspense, useEffect, useRef, useState } from "react";
import { lazyPage } from "./lib/lazyRoute";
import { ROUTER_BASENAME } from "./lib/basePath";
import { resetPrerenderReady, signalPrerenderReadyAfterPaint, isPrerendering } from "./lib/prerender";
import { LibraryProvider } from "./contexts/LibraryContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import { LoadingScreen } from "./components/states/LoadingScreen";
import { ErrorBoundary } from "./components/states/ErrorBoundary";
import { LanguageHint } from "./components/atoms/LanguageHint";
import { WorkshopPageContext } from "./contexts/WorkshopPageContext";
import {
  blogArticleLoader,
  blogIndexLoader,
  blogCategoryLoader,
  homePageLoader,
  templateArticleLoader,
  templateCategoryLoader,
  templatesIndexLoader,
  landingPageLoader,
  landingPagesLoader,
  landingPageHubLoader,
} from "./lib/routeLoaders";

import { siteRoutes, SiteFeedback } from '@/integrations/site';

// Layout component that wires page chrome and document title handling
function RootLayout() {
  const location = useLocation();
  const navigation = useNavigation();
  const workshopPageRef = useRef(false);
  workshopPageRef.current = false;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    resetPrerenderReady();
  }, [location.pathname]);

  useEffect(() => {
    let fired = false;

    const handleScroll = () => {
      if (!fired && window.scrollY > window.innerHeight) {
        fired = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isPrerendering()) {
      return;
    }

    if (location.pathname === "/landing-pages" || location.pathname === "/en/landing-pages") {
      return;
    }

    if (navigation.state !== "idle") {
      return;
    }

    return signalPrerenderReadyAfterPaint();
  }, [location.pathname, navigation.state]);
  
  return (
    <>
      <WorkshopPageContext.Provider value={workshopPageRef}>
        <LocaleProvider>
          <Outlet />
          {/* Voluntary language suggestion — rendered once here so it behaves
              uniformly on every page as a floating bubble (bottom-right). */}
          <LanguageHint />
        </LocaleProvider>
      </WorkshopPageContext.Provider>
      <SiteFeedback key={location.pathname} />
    </>
  );
}

// Router configuration with data loaders
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <LocaleProvider><ErrorBoundary /></LocaleProvider>,
    children: [
      ...siteRoutes,
      // ── DE routes (no prefix) ─────────────────────────────────────────────
      {
        path: "/",
        lazy: lazyPage(() => import("./pages/Index")),
        loader: homePageLoader,
      },
      {
        path: "/blog",
        lazy: lazyPage(() => import("./pages/Blog")),
        loader: blogIndexLoader,
      },
      {
        path: "/blog/methodes-d-atelier",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'methodes-d-atelier'),
      },
      {
        path: "/blog/actualites",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'actualites'),
      },
      {
        path: "/blog/astuces-outil",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'astuces-outil'),
      },
      {
        path: "/blog/ia-en-atelier",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'ia-en-atelier'),
      },
      {
        path: "/blog/:slug",
        lazy: lazyPage(() => import("./pages/BlogArticle")),
        loader: blogArticleLoader,
      },
      {
        path: "/templates",
        lazy: lazyPage(() => import("./pages/Templates")),
        loader: templatesIndexLoader,
      },
      {
        path: "/templates/retrospective",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'retrospective'),
      },
      {
        path: "/templates/liberating-structures",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'liberating-structures'),
      },
      {
        path: "/templates/atelier",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'atelier'),
      },
      {
        path: "/templates/decision",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'decision'),
      },
      {
        path: "/templates/:slug",
        lazy: lazyPage(() => import("./pages/LandingPage")),
        loader: templateArticleLoader,
      },
      {
        path: "/landing-pages",
        lazy: lazyPage(() => import("./pages/LandingPages")),
        loader: landingPagesLoader,
      },
      {
        path: "/landing-pages/ateliers",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'ateliers'),
      },
      {
        path: "/landing-pages/evenements",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'evenements'),
      },
      {
        path: "/landing-pages/fetes",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'fetes'),
      },
      {
        path: "/landing-pages/education-enseignement",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'education-enseignement'),
      },
      {
        path: "/404",
        lazy: lazyPage(() => import("./pages/NotFound")),
      },
      {
        path: "/:slug",
        lazy: lazyPage(() => import("./pages/LandingPage")),
        loader: landingPageLoader,
      },

      // ── EN routes (/en prefix) ────────────────────────────────────────────
      {
        path: "/en",
        lazy: lazyPage(() => import("./pages/Index")),
        loader: homePageLoader,
      },
      {
        path: "/en/blog",
        lazy: lazyPage(() => import("./pages/Blog")),
        loader: blogIndexLoader,
      },
      {
        path: "/en/blog/workshop-methods",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'workshop-methods'),
      },
      {
        path: "/en/blog/sessionplan-news",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'sessionplan-news'),
      },
      {
        path: "/en/blog/tool-tips",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'tool-tips'),
      },
      {
        path: "/en/blog/ai-in-workshops",
        lazy: lazyPage(() => import("./pages/BlogCategory")),
        loader: (args) => blogCategoryLoader(args, 'ai-in-workshops'),
      },
      {
        path: "/en/blog/:slug",
        lazy: lazyPage(() => import("./pages/BlogArticle")),
        loader: blogArticleLoader,
      },
      {
        path: "/en/templates",
        lazy: lazyPage(() => import("./pages/Templates")),
        loader: templatesIndexLoader,
      },
      {
        path: "/en/templates/retrospective",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'retrospective'),
      },
      {
        path: "/en/templates/liberating-structures",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'liberating-structures'),
      },
      {
        path: "/en/templates/workshop",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'atelier'),
      },
      {
        path: "/en/templates/decision",
        lazy: lazyPage(() => import("./pages/TemplateCategory")),
        loader: (args) => templateCategoryLoader(args, 'decision'),
      },
      {
        path: "/en/templates/:slug",
        lazy: lazyPage(() => import("./pages/LandingPage")),
        loader: templateArticleLoader,
      },
      {
        path: "/en/landing-pages",
        lazy: lazyPage(() => import("./pages/LandingPages")),
        loader: landingPagesLoader,
      },
      {
        path: "/en/landing-pages/ateliers",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'ateliers'),
      },
      {
        path: "/en/landing-pages/evenements",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'evenements'),
      },
      {
        path: "/en/landing-pages/creative-production",
        lazy: lazyPage(() => import("./pages/LandingPageHub")),
        loader: (args) => landingPageHubLoader(args, 'creative-production'),
      },
      {
        path: "/en/:slug",
        lazy: lazyPage(() => import("./pages/LandingPage")),
        loader: landingPageLoader,
      },

      // ── Fallback ──────────────────────────────────────────────────────────
      {
        path: "*",
        lazy: lazyPage(() => import("./pages/NotFound")),
      },
    ],
  },
], { basename: ROUTER_BASENAME || undefined });

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <LibraryProvider>
          <TooltipProvider>
            <Sonner />
            <Suspense fallback={<LoadingScreen />}>
              <RouterProvider router={router} />
            </Suspense>
          </TooltipProvider>
        </LibraryProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
