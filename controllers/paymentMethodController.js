import PaymentMethod from "../models/paymentMethodModel.js";

// CREATE
export const createPaymentMethod = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const method = await PaymentMethod.create({ name });
    res.status(201).json(method);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL
export const getPaymentMethods = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status === "true") filter.status = true;
    if (status === "false") filter.status = false;

    const methods = await PaymentMethod.find(filter).sort({ createdAt: -1 });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE STATUS
export const updatePaymentMethodStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const method = await PaymentMethod.findById(id);
    if (!method) {
      return res.status(404).json({ message: "Not found" });
    }

    method.status = !method.status; // 🔁 toggle
    await method.save();

    res.json(method);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE NAME
export const updatePaymentMethodName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const method = await PaymentMethod.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!method) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(method);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE
export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const method = await PaymentMethod.findByIdAndDelete(id);
    if (!method) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
