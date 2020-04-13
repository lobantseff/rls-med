import argparse
import os
import warnings
import utils.helpers as H

from pytorch_lightning.loggers import TensorBoardLogger
from pytorch_lightning.trainer import Trainer

from lightning_boilerplates.lightning_crls import CRLSModel


warnings.filterwarnings("ignore", category=DeprecationWarning)


def run(config: argparse.Namespace):
    tb_logger = TensorBoardLogger(
        save_dir=os.path.join(config.metaconf["ws_path"], 'tensorboard_logs'),
        name=config.metaconf["experiment_name"]
    )
    trainer = Trainer(
        gpus=config.metaconf["ngpus"],
        distributed_backend="dp",
        max_epochs=config.hyperparams["max_epochs"],
        logger=tb_logger,
        truncated_bptt_steps=10
    )

    model = CRLSModel(config)
    trainer.fit(model)


if __name__ == "__main__":
    args = H.arguments()
    config = H.load_params_namespace(args.train_config)
    H.set_logging_config("./configs/logging_config.yaml", config.metaconf["ws_path"])

    use_cuda = (True if config.metaconf["ngpus"] != 0 else False)
    H.random_seed_init(config.trainer["random_seed"], use_cuda)

    run(config)