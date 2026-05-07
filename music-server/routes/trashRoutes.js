const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth"); 
const {
  getTrash,
  restore,
  permanentDelete,
} = require("../controllers/trashController");

router.get   ("/",                   protect, getTrash);
router.put   ("/:trashId/restore",   protect, restore);
router.delete("/:trashId/permanent", protect, permanentDelete);

module.exports = router;