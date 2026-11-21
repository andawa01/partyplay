export interface PublicNavLink {
  to: string;
  label: string;
}

/** Launch navigation, shared by the header and footer so the two never drift. */
export const publicLinks: PublicNavLink[] = [
  { to: "/", label: "Home" },
  { to: "/equipment", label: "Equipment" },
  { to: "/packages", label: "Packages" },
  { to: "/offers", label: "Offers" },
  { to: "/booking", label: "Booking" },
  { to: "/contact", label: "Contact" },
];
