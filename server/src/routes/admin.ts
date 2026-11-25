import { Router } from "express";

import * as blackouts from "../controllers/blackouts";
import * as bookings from "../controllers/bookings";
import * as categories from "../controllers/categories";
import * as dashboard from "../controllers/dashboard";
import * as equipment from "../controllers/equipment";
import * as offers from "../controllers/offers";
import * as packages from "../controllers/packages";
import * as payments from "../controllers/payments";
import * as site from "../controllers/site";
import * as staff from "../controllers/staff";
import * as providers from "../controllers/transport-providers";
import * as uploads from "../controllers/uploads";
import { asyncHandler } from "../lib/async";
import { requireAdmin, requireRole } from "../middleware/auth";

const router = Router();

// One guard for the whole surface: no admin route can be reachable without a session,
// and no future route can forget to add it.
router.use(requireAdmin);

// Staff may read the catalogue (the booking editor needs it) but not change it. Money,
// catalogue configuration and settings are admin-or-owner only; team management is the
// owner's alone.
const manager = requireRole("OWNER", "ADMIN");

router.get("/users", requireRole("OWNER"), asyncHandler(staff.listStaff));
router.post("/users", requireRole("OWNER"), asyncHandler(staff.createStaff));
router.patch("/users/:id", requireRole("OWNER"), asyncHandler(staff.updateStaff));
router.post("/users/:id/password", requireRole("OWNER"), asyncHandler(staff.setStaffPassword));

router.post("/uploads/sign", manager, asyncHandler(uploads.signImageUpload));

router.post("/categories", manager, asyncHandler(categories.createCategory));
router.patch("/categories/:id", manager, asyncHandler(categories.updateCategory));
router.delete("/categories/:id", manager, asyncHandler(categories.deleteCategory));

router.get("/equipment", asyncHandler(equipment.listAdminEquipment));
router.get("/equipment/:id", asyncHandler(equipment.getAdminEquipment));
router.post("/equipment", manager, asyncHandler(equipment.createEquipment));
router.patch("/equipment/:id", manager, asyncHandler(equipment.updateEquipment));
router.delete("/equipment/:id", manager, asyncHandler(equipment.deactivateEquipment));
router.put("/equipment/:id/inventory", manager, asyncHandler(equipment.setInventory));

router.get("/blackouts", asyncHandler(blackouts.listBlackouts));
router.post("/blackouts", manager, asyncHandler(blackouts.createBlackout));
router.delete("/blackouts/:id", manager, asyncHandler(blackouts.deleteBlackout));

router.get("/packages", asyncHandler(packages.listAdminPackages));
router.get("/packages/:id", asyncHandler(packages.getAdminPackage));
router.post("/packages", manager, asyncHandler(packages.createPackage));
router.patch("/packages/:id", manager, asyncHandler(packages.updatePackage));
router.delete("/packages/:id", manager, asyncHandler(packages.deletePackage));
router.put("/packages/:id/items", manager, asyncHandler(packages.replacePackageItems));

router.get("/offers", asyncHandler(offers.listAdminOffers));
router.post("/offers", manager, asyncHandler(offers.createOffer));
router.patch("/offers/:id", manager, asyncHandler(offers.updateOffer));
router.delete("/offers/:id", manager, asyncHandler(offers.deleteOffer));

router.get("/transport-providers", asyncHandler(providers.listTransportProviders));
router.post("/transport-providers", manager, asyncHandler(providers.createTransportProvider));
router.patch("/transport-providers/:id", manager, asyncHandler(providers.updateTransportProvider));
router.delete("/transport-providers/:id", manager, asyncHandler(providers.deleteTransportProvider));

router.get("/bookings", asyncHandler(bookings.listAdminBookings));
router.get("/bookings/:id", asyncHandler(bookings.getAdminBooking));
router.patch("/bookings/:id", asyncHandler(bookings.updateBookingDetails));
router.patch("/bookings/:id/status", asyncHandler(bookings.updateBookingStatus));
router.patch("/bookings/:id/transport", asyncHandler(bookings.updateBookingTransport));
router.post("/bookings/:id/availability", asyncHandler(bookings.checkBookingAvailability));

router.post("/bookings/:id/payments", manager, asyncHandler(payments.createPayment));
router.get("/bookings/:id/payments", manager, asyncHandler(payments.listPayments));
router.patch("/payments/:id", manager, asyncHandler(payments.updatePayment));
router.delete("/payments/:id", manager, asyncHandler(payments.deletePayment));
router.post("/payments/:id/refunds", manager, asyncHandler(payments.refundPayment));

router.get("/dashboard", asyncHandler(dashboard.getDashboard));

router.get("/settings", asyncHandler(site.getSettings));
router.put("/settings", manager, asyncHandler(site.updateSettings));

export default router;
