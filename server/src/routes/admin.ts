import { Router } from "express";

import * as bookings from "../controllers/bookings";
import * as categories from "../controllers/categories";
import * as dashboard from "../controllers/dashboard";
import * as equipment from "../controllers/equipment";
import * as offers from "../controllers/offers";
import * as packages from "../controllers/packages";
import * as payments from "../controllers/payments";
import * as site from "../controllers/site";
import * as providers from "../controllers/transport-providers";
import { asyncHandler } from "../lib/async";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// One guard for the whole surface: no admin route can be reachable without a session,
// and no future route can forget to add it.
router.use(requireAdmin);

router.post("/categories", asyncHandler(categories.createCategory));
router.patch("/categories/:id", asyncHandler(categories.updateCategory));
router.delete("/categories/:id", asyncHandler(categories.deleteCategory));

router.get("/equipment", asyncHandler(equipment.listAdminEquipment));
router.get("/equipment/:id", asyncHandler(equipment.getAdminEquipment));
router.post("/equipment", asyncHandler(equipment.createEquipment));
router.patch("/equipment/:id", asyncHandler(equipment.updateEquipment));
router.delete("/equipment/:id", asyncHandler(equipment.deactivateEquipment));
router.put("/equipment/:id/inventory", asyncHandler(equipment.setInventory));

router.get("/packages", asyncHandler(packages.listAdminPackages));
router.get("/packages/:id", asyncHandler(packages.getAdminPackage));
router.post("/packages", asyncHandler(packages.createPackage));
router.patch("/packages/:id", asyncHandler(packages.updatePackage));
router.delete("/packages/:id", asyncHandler(packages.deletePackage));
router.put("/packages/:id/items", asyncHandler(packages.replacePackageItems));

router.get("/offers", asyncHandler(offers.listAdminOffers));
router.post("/offers", asyncHandler(offers.createOffer));
router.patch("/offers/:id", asyncHandler(offers.updateOffer));
router.delete("/offers/:id", asyncHandler(offers.deleteOffer));

router.get("/transport-providers", asyncHandler(providers.listTransportProviders));
router.post("/transport-providers", asyncHandler(providers.createTransportProvider));
router.patch("/transport-providers/:id", asyncHandler(providers.updateTransportProvider));
router.delete("/transport-providers/:id", asyncHandler(providers.deleteTransportProvider));

router.get("/bookings", asyncHandler(bookings.listAdminBookings));
router.get("/bookings/:id", asyncHandler(bookings.getAdminBooking));
router.patch("/bookings/:id/status", asyncHandler(bookings.updateBookingStatus));
router.patch("/bookings/:id/transport", asyncHandler(bookings.updateBookingTransport));
router.post("/bookings/:id/availability", asyncHandler(bookings.checkBookingAvailability));

router.post("/bookings/:id/payments", asyncHandler(payments.createPayment));
router.get("/bookings/:id/payments", asyncHandler(payments.listPayments));
router.patch("/payments/:id", asyncHandler(payments.updatePayment));
router.delete("/payments/:id", asyncHandler(payments.deletePayment));

router.get("/dashboard", asyncHandler(dashboard.getDashboard));

router.get("/settings", asyncHandler(site.getSettings));
router.put("/settings", asyncHandler(site.updateSettings));

export default router;
